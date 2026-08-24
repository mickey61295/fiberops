/*    
;=============================================    
; Author  :  Global Software's    
; Create date  :  31/Mar/2020
; Create By  :  ASLAM    
; Description  :  Production Entry Posting From Barcode Bundle and Pcs Data  
; Change Person  :  ASLAM  
; Last Change Date :  31/Mar/2020 10.50 AM    
; =============================================   */  
CREATE PROCEDURE [dbo].[SP_Barcode_Production_Posting]
AS    
BEGIN  
SET NOCOUNT ON     
SET ANSI_NULLS ON    
SET QUOTED_IDENTIFIER ON    
Declare @ProdID int;  
DECLARE @Sno int    ,    
    @Coycode int    ,    
    @EntryDate DateTime    ,    
    @StageID Int  ,    
    @OrdID Int  ,    
    @StyleID Int  ,    
    @ColId Int   ,    
    @OperatorID Int,    
	@Rework Int ,    
    @Pay Char(1),    
    @StyleNo varchar(20) ,    
    @PartId Int    ,    
    @GodId Int  ,    
    @PreparedBy Int,    
    @HrsID Int ,    
    @SizeID Int ,    
    @ProdPcs Int,  
    @RecCount Int,  
    @ExistProdID Int,  
    @SizeRecCount Int,  
    @StageSeqNo as Int,    
    @Stage as Varchar(50),    
    @PreviousStageID as Int,    
    @SEMIFINISH Char(1),
	@HeaderID as Int ,
	@LotID as int,
	@LotNo Varchar(15),
	@SourceStageID as int ,
	@BundleMasId as int,
	@BundleID as Int
 
begin tran

begin try


DECLARE Prod_Cursor_Bundle CURSOR FOR    

  Select A.Coycode,A.prodDate,A.StageID,b.OrdID,IsNull(B.StyleId,0) as StyleID,C.ColId,A.EmpId,0 as Rework,'N' as Pay,B.StyleNo,C.PartID,1 as GodID, 1 as PreparedBy ,a.HrsID as HrsID,SizeId, Sum(A.Pcs) as ProdPcs,A.SourceStageId as SourceStageID,b.lotno From Pay_Bundle_ProdEntry A INNER JOIN Pay_BarcodeGeneration B ON A.barcode = B.barcode and A.BundleMasid = B.BundleMasID And A.BundleId =B.BundleId 
  INNER JOIN Pay_CuttProdMas C ON A.BundleMasID = C.ID INNER JOIN Pay_CuttProd_Bundle D ON D.Id = c.Id and a.bundleMasId = D.Id And A.BundleID = D.BundleId 
  Where ISNULL(PostingFlg,'N') ='N'  Group By A.Coycode,A.ProdDate,A.StageID,B.OrdID,
  IsNull(B.StyleId,0) ,C.ColId,A.EmpId,B.StyleNo,C.PartID,SizeId,A.HrsID,b.LotNo,A.SourceStageId Order by A.prodDate ,B.OrdID,a.StageID  

   OPEN Prod_Cursor_Bundle;    
   FETCH NEXT FROM Prod_Cursor_Bundle  INTO @Coycode,@EntryDate,@StageId,@OrdID,@StyleId,@ColId,@OperatorID,@Rework,@Pay,@StyleNo,@PartID, @GodID,@PreparedBy,  @HrsId,@SizeID,@ProdPcs,@SourceStageID,@LotNo ;    
   WHILE @@FETCH_STATUS = 0    
   BEGIN    
   SELECT @ProdID = IsNull(Max(ID),0) +1  from Trs_ProdEntry  
   SET @Sno = @Sno + 1  
   if RTrim(@LotNo)='' 
   SELECT @LotID = 0
   else
   SELECT @LotID = LotSno from Mas_Lot where LotName=@LotNo
   
    INSERT INTO Trs_Prodentry (CoyId,Dt,StageID,SNo,OrdId,StyleId,ClrId,EmpId,Rework,Pay,StyleNo,PARTID, id,GodID,PreparedBy,HrsID,SourceStageId,lotno,LotId)  VALUES (@Coycode,@EntryDate,@StageId,1,@OrdID,@StyleId,@ColId,@OperatorID, @Rework,@Pay,@StyleNo,  
	   @PartID,@ProdID,@GodID,@PreparedBy,@HrsId,@SourceStageID,@Lotno,@LotID)    

	   Exec Sp_ProductionEntryQty @ProdID,@SizeID,@ProdPcs


  
 UPDATE Pay_Bundle_ProdEntry SET PostingFlg = 'Y' WHERE ProdDate = @EntryDate and PostingFlg IS NULL  
 
 if @@ERROR <> 0 
     begin
		 if @@TRANCOUNT > 0
          rollback tran

        close Prod_Cursor_Bundle   
        deallocate Prod_Cursor_Bundle
        return @@ERROR
	end 

    FETCH NEXT FROM Prod_Cursor_Bundle  INTO @Coycode,@EntryDate,@StageId,@OrdID, @StyleId, @ColId, @OperatorID, @Rework, @Pay, @StyleNo, @PartID, @GodID, @PreparedBy,  @HrsId,@SizeID,@ProdPcs,@SourceStageID,@LotNo ;  
   END;    
   select @Sno =0;    
   CLOSE Prod_Cursor_Bundle;    
   DEALLOCATE Prod_Cursor_Bundle;    

   commit tran
    return 0

	end try
  begin catch
		close Prod_Cursor_Bundle   
        deallocate Prod_Cursor_Bundle
    return @@ERROR

  end catch
 

begin tran

begin try

 DECLARE Prod_Cursor_Pcs CURSOR FOR    

  Select A.Coycode,A.prodDate,A.StageID,b.OrdID,IsNull(B.StyleId,0) as StyleID,C.ColId,A.EmpId,0 as Rework,'N' as Pay,B.StyleNo,C.PartID,1 as GodID, 1 as PreparedBy ,a.HrsID as HrsID,SizeId, Sum(A.Pcs) as ProdPcs,A.SourceStageID as SourceStageID,b.lotno,A.BundlemasId,a.BundleId From Pay_Pcs_ProdEntry A INNER JOIN 
  Pay_BundlePcs_Barcode A1 ON A.Barcode= A1.PcsBarcode and A.BundlemasId = A1.BundleMasID And A.BundleId = A1.BundleId INNER JOIN (Select Distinct BundleMasID,Bundleid,Ordid,StyleNo,LotNo,StyleID From Pay_BarcodeGeneration )B ON A.BundleMasid = B.BundleMasID And A.BundleId =B.BundleId 
  INNER JOIN Pay_CuttProdMas C ON A.BundleMasID = C.ID INNER JOIN Pay_CuttProd_Bundle D ON D.Id = c.Id and a.bundleMasId = D.Id And A.BundleID = D.BundleId 
  Where ISNULL(A.PostingFlg,'N') ='N'  Group By A.Coycode,A.ProdDate,A.StageID,B.OrdID,
  IsNull(B.StyleId,0) ,C.ColId,A.EmpId,B.StyleNo,C.PartID,SizeId,A.HrsID,b.LotNo,A.SourceStageId,A.BundlemasId,a.BundleId Order by A.prodDate ,B.OrdID,a.StageID  

   OPEN Prod_Cursor_Pcs;    
   FETCH NEXT FROM Prod_Cursor_Pcs  INTO @Coycode,@EntryDate,@StageId,@OrdID,@StyleId,@ColId,@OperatorID,@Rework,@Pay,@StyleNo,@PartID, @GodID,@PreparedBy,  @HrsId,@SizeID,@ProdPcs,@SourceStageID,@LotNo,@BundlemasId,@BundleId ;    
   WHILE @@FETCH_STATUS = 0    
   BEGIN    
   SELECT @ProdID = IsNull(Max(ID),0) +1  from Trs_ProdEntry  
   SET @Sno = @Sno + 1  
   if RTrim(@LotNo)='' 
   SELECT @LotID = 0
   else
   SELECT @LotID = LotSno from Mas_Lot where LotName=@LotNo
   
    INSERT INTO Trs_Prodentry (CoyId,Dt,StageID,SNo,OrdId,StyleId,ClrId,EmpId,Rework,Pay,StyleNo,PARTID, id,GodID,PreparedBy,HrsID,SourceStageId,lotno,LotId)  VALUES (@Coycode,@EntryDate,@StageId,1,@OrdID,@StyleId,@ColId,@OperatorID, @Rework,@Pay,@StyleNo,  
	   @PartID,@ProdID,@GodID,@PreparedBy,@HrsId,@SourceStageID,@Lotno,@LotID)    

	   Exec Sp_ProductionEntryQty @ProdID,@SizeID,@ProdPcs


  Update Pay_BundlePcs_Barcode Set ProdID =@PRodId,PostingFlg='Y' From Pay_BundlePcs_Barcode a inner join Pay_Pcs_ProdEntry b on a.BundleMasID = B.BundlemasId and a.BundleId = b.BundleId and a.PcsBarcode = b.Barcode WHERE A.BundleMasID=@BundleMasId and A.BundleId = @BundleID

 UPDATE Pay_Pcs_ProdEntry SET PostingFlg = 'Y' WHERE ProdDate = @EntryDate and PostingFlg IS NULL  
 
 if @@ERROR <> 0 
     begin
		 if @@TRANCOUNT > 0
          rollback tran

        close Prod_Cursor_Bundle   
        deallocate Prod_Cursor_Bundle
        return @@ERROR
	end 

    FETCH NEXT FROM Prod_Cursor_Pcs  INTO @Coycode,@EntryDate,@StageId,@OrdID, @StyleId, @ColId, @OperatorID, @Rework, @Pay, @StyleNo, @PartID, @GodID, @PreparedBy,  @HrsId,@SizeID,@ProdPcs,@SourceStageID,@LotNo,@BundlemasId,@BundleId ;  
   END;    
   select @Sno =0;    
   CLOSE Prod_Cursor_Pcs;    
   DEALLOCATE Prod_Cursor_Pcs;    

    commit tran
    return 0

	end try
  begin catch
		close Prod_Cursor_Bundle   
        deallocate Prod_Cursor_Bundle
    return @@ERROR

  end catch
SET NOCOUNT OFF     
END   

--EXEC SP_Barcode_Production_Posting  





 
GO


