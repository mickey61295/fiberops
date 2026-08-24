/*;=============================================   
; Author           :  Global Software's    
; Create date      :  17/08/2022    
; Create By        :  ASLAM  
; Description      :  FINISHED STAGE REJECTION STOCK  
; Change Person    :  M.SUGANYA
; Last Change Date :  03/05/2025 09.00 AM 
; =============================================  */  
CREATE PROCEDURE PROC_Stock_ProdRej_Insert_Finish (@Id Int,@Styleno Varchar(20),@PartID Int,@ColId Int,@SizeId Int,@Pcs Int,@LotNo Varchar(15)) AS   DECLARE @Coycode Int,@Ordid Int,@StageId Int,@GodId Int,@StockQty Int,@FinalStage Char(1),@SeqNo int,@PartyId Int,@PcsStockId Int,@RejectionTypeId Int,@LotId Int   ,@StageID1 int  ,@EntryOption int,@PartID1 int,@ColID1 int,@PcsPerColor int,@StkQty int

Select @Coycode = CoyId From Trs_PcsRej Where Id=@Id  
select @PartyId = 0   
SELECT @Ordid = OrdId From Trs_PcsRej Where Id=@Id  
SELECT @StyleNo = StyleNo From Trs_PcsRej Where Id=@Id  
SELECT @Stageid = isNull(Stk_StageId,StageId) From Trs_PcsRej Where Id=@Id  
SELECT @Stageid1 = StageId From Trs_PcsRej Where Id=@Id  
SELECT @PartId = PartId From Trs_PcsRej Where Id=@Id  
SELECT @GodId = GodId From Trs_PcsRej Where Id=@Id  
SELECT @RejectionTypeId = RejectionTypeId From Trs_PcsRej Where Id=@Id  
Select @SeqNo = SeqNo From Trs_PcsRej Inner Join Prod_Sequence On Trs_PcsRej.OrdId=Prod_Sequence.OrdId And Trs_PcsRej.StyleNo=Prod_Sequence.StyleNo And Trs_PcsRej.StageId=Prod_Sequence.StageId Where Id=@Id  
SELECT @FinalStage = Mas_Dept.SemiFinish From Trs_PcsRej Inner Join Mas_JobWrkComp On Trs_PcsRej.Stk_StageId=Mas_JobWrkComp.Id Inner Join Mas_Dept On Mas_JobWrkComp.DeptId=Mas_Dept.DeptId Where Trs_PcsRej.Id=@Id  

SELECT @EntryOption = Entryoption from OrderStyleDtl Where Ordid = @Ordid and StyleNo = @Styleno 

SELECT @ColId = ClrId From Trs_PcsRej Where Id=@Id  


SELECT @StockQty = @Pcs 

if ltrim(@LotNo)<>''  
	SELECT @LotID = LotSno from Mas_Lot Where LotName =LTrim(@LotNo)  

ELSE  

	SELECT @LotId = 0   

Begin  

 Begin   

 DECLARE @Cnt INT


 SET @Cnt =1

 IF @EntryOption =1  and @LotNo =''

 BEGIN 

 DECLARE LINE_CURSOR CURSOR FOR           

  
  
 Select PartId,ColID,PcsPerColor from OrderQtyDtl  WHeRE Ordid = @Ordid And Styleno = @Styleno  and ColID =@ColId Group by Partid,ColID,PcsPerColor

 

 OPEN LINE_CURSOR   



 FETCH NEXT FROM LINE_CURSOR  INTO @PartId,@ColId1,@PcsPerColor

 END 

 IF @EntryOption = 1 and @LotNo <>''
 BEGIN
 DECLARE LINE_CURSOR CURSOR FOR           

  
  
 Select PartId,ColID,PcsPerColor from OrderQtyDtl  WHeRE Ordid = @Ordid And Styleno = @Styleno And LotNo =@LotNo and ColID =@ColId Group by Partid,ColID,PcsPerColor

 

 OPEN LINE_CURSOR   



 FETCH NEXT FROM LINE_CURSOR  INTO @PartId,@ColId1,@PcsPerColor

 END

 IF @EntryOption = 2 And @LotNo <> ''
 BEGIN

 DECLARE LINE_CURSOR CURSOR FOR           

  

 Select PartId,ColID,PcsPerColor from OrderQtyDtl  WHeRE Ordid = @Ordid And Styleno = @Styleno And LotNo =@LotNo Group by Partid,ColID,PcsPerColor

 

 OPEN LINE_CURSOR   



 FETCH NEXT FROM LINE_CURSOR  INTO @PartId,@ColId1,@PcsPerColor

 END

  IF @EntryOption = 2 And @LotNo = ''
 BEGIN

 DECLARE LINE_CURSOR CURSOR FOR           

  

 Select PartId,ColID,PcsPerColor from OrderQtyDtl  WHeRE Ordid = @Ordid And Styleno = @Styleno  Group by Partid,ColID,PcsPerColor

 

 OPEN LINE_CURSOR   



 FETCH NEXT FROM LINE_CURSOR  INTO @PartId,@ColId1,@PcsPerColor

 END
 
WHILE @@FETCH_STATUS = 0    

BEGIN   


If EXISTS (Select * from Pcs_StockTable where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotID = @LotID and Stageid=@Stageid1 and PartId=@PartId and GodId=@GodId and PartyId=0 And ISNULL(Pcs_StockTable.EmpID,0) = 0)  

BEGIN  

Select @PcsStockId=PcsStockId From Pcs_StockTable where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotID = @LotID and Stageid=@Stageid1 and PartId=@PartId and GodId=@GodId and PartyId=0  And ISNULL(Pcs_StockTable.EmpID,0) = 0




If EXISTS (select * from Pcs_StockTable Inner Join Pcs_StockTableQty On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo 



and LotID = @LotID and Stageid=@Stageid1 and PartId=@PartId and GodId=@GodId and PartyId=@PartyId and Pcs_StockTableQty.ColId=@ColId1 and Pcs_StockTableQty.SizeId=@SizeId and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')='M' and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=@RejectionTypeId  And ISNULL(Pcs_StockTable.EmpID,0) = 0)   



BegiN 





print @pcsperColor

 

Update Pcs_StockTableQty Set Pcs_StockTableQty.StockQty=Pcs_StockTableQty.StockQty+(@StockQty * @PcsPerColor) From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotID = @LotID and Stageid=@Stageid1 and PartId=@PartId and GodId=@GodId and PartyId=@PartyId and Pcs_StockTableQty.ColId=@ColId1 and Pcs_StockTableQty.SizeId=@SizeId and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')='M' and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=@RejectionTypeId    And ISNULL(Pcs_StockTable.EmpID,0) = 0 



	End  



	Else  



	Begin  

	 SET @StkQty = @StockQty * @PcsPerColor




		INSERT INTO Pcs_StockTableQty (PcsStockId,colid,Sizeid,StockQty,GoodPcsFlag,RejectionTypeId) VALUES				(@PcsStockId,@ColId1,@Sizeid,@StkQty,'M',@RejectionTypeId)



	 End 



 End 

 Else 


 begiN 



 Select @PcsStockId=Max(IsNull(PcsStockId,0))+1 From Pcs_StockTable 

 SET @StkQty = @StockQty * @PcsPerColor



 



 INSERT INTO Pcs_StockTable (Coycode,Ordid,styleNo,Stageid,PartId,SeqNo,GodId,PcsStockId,PartyId,LotID) VALUES (@Coycode,@Ordid,@StyleNo,@Stageid,@PartId,@SeqNo,@GodId,@PcsStockId,@PartyId,@LotId) 



 



 INSERT INTO Pcs_StockTableQty (PcsStockId,colid,Sizeid,StockQty,GoodPcsFlag,RejectionTypeId) VALUES (@PcsStockId,@ColId1,@Sizeid,@StkQty,'M',@RejectionTypeId) 



 End 



 



 Select @PcsStockId=PcsStockId From Pcs_StockTable where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotID = @LotID and Stageid=@StageId and PartId=@PartId and GodId=@GodId and PartyId=@PartyId  And ISNULL(Pcs_StockTable.EmpID,0) = 0

 if @Cnt =1 

 BEGIN

 Update Pcs_StockTableQty Set Pcs_StockTableQty.StockQty=Pcs_StockTableQty.StockQty-@StockQty,Pcs_StockTableQty
 .ProductionQty=Pcs_StockTableQty.ProductionQty-@StockQty From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotID = @LotID and Stageid
=@StageId and PartId=0 and GodId=@GodId and PartyId=@PartyId and Pcs_StockTableQty.ColId=@ColId and Pcs_StockTableQty.SizeId=@SizeId and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')='G' and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=0   And ISNULL(Pcs_StockTable.EmpID,0) = 0

END





	FETCH NEXT FROM LINE_CURSOR  INTO @PartId,@ColId1,@PcsPerColor



	SET @cnt= @Cnt +1

   



 



End 

 CLOSE LINE_CURSOR   



  DEALLOCATE LINE_CURSOR 

END



END
