/*;=============================================   
; Author           :  Global Software's    
; Create date      :  17/08/2022    
; Create By        :  ASLAM  
; Description      :  QUERY
; Change Person    :  ASLAM
; Last Change Date :  06/12/2024 10.20 AM 
; =============================================  */  
CREATE PROCEDURE PROC_Stock_PiecesDelivery_Insert (@Id Int,@Styleno Varchar(20),@PartId int,@ColId Int,@SizeId Int,@SourceStageID Int,@Pcs Int,@LotNo Varchar(15)) AS  DECLARE @Coycode Int,@Partyid Int,@Ordid int,@Stageid int,@GodId int,@SeqNo int,@StockQty int,@PcsStockId int,@ProcessType Char(1),@RejectionTypeId Int ,@DelType Varchar(30) ,@BuyerId Int,@FinishedStageID Int ,@LotId Int ,@Prod_Without_Lot_Despatch_WithLot as char(1), @LotwiseStockReqd   char(1) ,@GAN_PCS Char(1)  ,@Knit_Woven_Both_OrderType as char(1),@GAN_RewrkFlg Char(1) ='N'

SELECT @Prod_Without_Lot_Despatch_WithLot = isNull(Prod_Without_Lot_Despatch_WithLot,'Y') from Options1    

SELECT @Coycode = Coycode FROM trs_pcs1 where id=@id     

Select @Partyid = IsNull(Party,0) from trs_pcs1 where id=@id     

SELECT @Ordid = OrdJobNo from trs_pcs1 where id=@id      

SELECT @Stageid = TargetStageID from trs_pcs1 where id=@id      

SELECT @GodId = GodId from trs_pcs1 where id=@id      

SELECT @ProcessType = ProcessType from trs_pcs1 where id=@id     

SELECT @RejectionTypeId = RejectionTypeId from trs_pcs1 where id=@id      

Select @SeqNo = SeqNo From Prod_Sequence Where Prod_Sequence.OrdId=@OrdId And Prod_Sequence.StyleNo=@StyleNo And Prod_Sequence.StageId=@Stageid  

SELECT @StockQty = @Pcs   

SELECT @LotwiseStockReqd = isNull(LotwiseStock,'Y') from ORDERMAS2 WHERE ORDID=@ORDID  

SELECT @DelType = Deltype from Trs_Pcs1 Where id =@Id   

SELECT @GAN_PCS = IsNull(GRNAcceptance_Pcs,'N') from Options

SELECT @Knit_Woven_Both_OrderType = IsNull(Knit_Woven_Both_OrderType,'K') From OrderMas Where ORdid = @Ordid 



if @GAN_PCS ='Y' and @Knit_Woven_Both_OrderType ='W' and @ProcessType ='R'

BEGIN

	SET @ProcessType='R'

	SET @GAN_RewrkFlg ='Y'

END



print @ProcessType

print @GAN_RewrkFlg



if ltrim(@LotNo)<>''      

	SELECT @LotID  = LotSno from mas_Lot where LotName =LTrim(@LotNo)     

	else     

	SELECT @LotId = 0     

if @DelType ='Despatch'   

begin 

if Rtrim(@LotwiseStockReqd) ='N' And RTrim(@Prod_Without_Lot_Despatch_WithLot)='Y'   

BEGIN    

	SELECT @LotId = 0   

END   

end    

	SELECT @DelType = Deltype from Trs_Pcs1 Where id =@Id     

		if @DelType ='Sales' 	

			begin 

				Select  @FinishedStageID = @SourceStageID 

				SELECT @BuyerId = 1   

			end  

			ELSE 	  

			begin  

			Select   @FinishedStageID = -3  

				SELECT @BuyerId = Buyer from Trs_Pcs1 Where id =@Id  	 

			end  

			if @DelType ='Sales'     

			BEGIN	  

				SELECT @PartyID = 0   END /*Select Top 1 @FinishedStageID = StageId  From Pcs_StockTable A INNER JOIN Mas_JobWrkComp B ON A.StageId = B.I

D INNER JOIN Mas_Dept C ON B.DeptId = C.DeptID INNER JOIN Trs_Pcs1 D ON A.ORdid = D.Ordjobno Where D.ID = @ID And StyleNo=@StyleNo And  SEMIFINISH='F'   */ 

BEGIN    

If @PartyId>0   

Begin  

If EXISTS (select * from Pcs_StockTable where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and Stageid=@Stageid and LotID = @LotId and PartId=@PartId and GodId=@GodId and PartyId=@PartyId And ISNULL(Pcs_StockTable.EmpID,0) = 0)   

Begin     

Select @PcsStockId=PcsStockId From Pcs_StockTable where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo 

and LotID = @LotID and Stageid=@Stageid and PartId=@PartId and GodId=@GodId and PartyId=@PartyId And ISNULL(Pcs_StockTable.EmpID,0) = 0
print 'procee'
  print @ProcessType

If EXISTS (select * from Pcs_StockTable Inner Join Pcs_StockTableQty On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and Stageid=@Stageid and PartId=@PartId and GodId=@GodId and PartyId=@PartyId and Pcs_StockTableQty.ColId=@Colid and Pcs_StockTableQty.SizeId=@SizeId and Pcs_StockTable.LotID = @LotId and IsNull(GoodPcsFlag,'G')=Case When @ProcessType='P' Then 'G' Else 'M' End  and IsNull(RejectionTypeId,0)=Case When @ProcessType='P' Then 0 Else @RejectionTypeId End And ISNULL(Pcs_StockTable.EmpID,0) = 0)     

Begin     

if @DelType <> 'JobWork Return'    

BEGIN     
print 'asl'
if @GAN_RewrkFlg='Y'  

BEGIN

print 'a'
/*
Update Pcs_StockTableQty Set Pcs_StockTableQty.RewrkStk=isNull(Pcs_StockTableQty.RewrkStk,0)+@StockQty From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo And LotId= @LotID and Stageid=@Stageid and PartId=@PartId and GodId=@GodId and PartyId=@PartyId and Pcs_StockTableQty.ColId=@Colid and Pcs_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')=Case When @ProcessType='P' Then 'G' Else 'M' End and IsNull(RejectionTypeId,0)=Case When @ProcessType='P' Then 0 Else @RejectionTypeId  End      */

Update Pcs_StockTableQty Set Pcs_StockTableQty.StockQty=isNull(Pcs_StockTableQty.StockQty,0)+@StockQty From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo And LotId= @LotID and Stageid=@Stageid and PartId=@PartId and GodId=@GodId and PartyId=@PartyId and Pcs_StockTableQty.ColId=@Colid and Pcs_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')=Case When @ProcessType='P' Then 'G' Else 'M' End and IsNull(RejectionTypeId,0)=Case When @ProcessType='P' Then 0 Else @RejectionTypeId  End    And ISNULL(Pcs_StockTable.EmpID,0) = 0  




END

ELSE

BEGIN

print 'b'

Update Pcs_StockTableQty Set Pcs_StockTableQty.StockQty=Pcs_StockTableQty.StockQty+@StockQty From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo And LotId= @LotID and Stageid=@Stageid and PartId=@PartId and GodId=@GodId and PartyId=@PartyId and Pcs_StockTableQty.ColId=@Colid and Pcs_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')=Case When @ProcessType='P' Then 'G' Else 'M' End and 
IsNull(RejectionTypeId,0)=Case When @ProcessType='P' Then 0 Else @RejectionTypeId  End And ISNULL(Pcs_StockTable.EmpID,0) = 0     

END

END     

End    

Else      

Begin   /*Insert into tmp_trg Values ('START3')*/   

print 'c'

INSERT INTO Pcs_StockTableQty (PcsStockId,colid,Sizeid,StockQty,GoodPcsFlag,RejectionTypeId) VALUES (@PcsStockId,@ColId,@Sizeid,@StockQty,Case When @ProcessType='P' Then 'G' Else 'M' End,Case When @ProcessType='P' Then 0 Else @RejectionTypeId End)    

End    

End    

Else     

Begin     

if @DelType <> 'JobWork Return'  	 

begin   

Select @PcsStockId=Max(IsNull(PcsStockId,0))+1 From Pcs_StockTable  /*Insert into tmp_trg Values ('START4')*/  	  

INSERT INTO Pcs_StockTable (Coycode,Ordid,styleNo,Stageid,PartId,SeqNo,GodId,PcsStockId,PartyId,LotID ) VALUES (@Coycode,@Ordid,@StyleNo,@Stageid,@PartId,@SeqNo,@GodId,@PcsStockId,@PartyId,@LotId)    	  	  

print 'd'

INSERT INTO Pcs_StockTableQty (PcsStockId,colid,Sizeid,StockQty,GoodPcsFlag,RejectionTypeId) VALUES (@PcsStockId,@ColId,@Sizeid,@StockQty,Case When @ProcessType='P' Then 'G' Else 'M' End,Case When @ProcessType='P' Then 0 Else @RejectionTypeId End)   

end    

End      

End 

    if @Buyerid >0 and (@DelType='Despatch' OR @DelType ='Sales')    

	Begin     

	if @DelType ='Sales'     

	BEGIN	  

		SELECT @PartyID = 0   

	END  

	If EXISTS (select * from Pcs_StockTable where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo And LotID = @LotID and Stageid=@FinishedStageID and PartId=@PartId and GodId=@GodId and PartyId=@PartyId And ISNULL(Pcs_StockTable.EmpID,0) = 0)       

	begin /*Insert into tmp_trg Values ('Despatch 2 ')*/   

	If EXISTS (select * from Pcs_StockTable Inner Join Pcs_StockTableQty On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo And LotId = @LotID and Stageid=@FinishedStageID and PartId=@PartId
 and GodId=@GodId and PartyId=0  and Pcs_StockTableQty.ColId=@Colid and Pcs_StockTableQty.SizeId=@SizeId 

 and IsNull(GoodPcsFlag,'G')='G' and IsNull(RejectionTypeId,0)=0 And ISNULL(Pcs_StockTable.EmpID,0) = 0 )     

 Begin   /*Insert into tmp_trg Values ('DespSTART2 -' + str(@StockQty))*/    

 print 'e'

 Update Pcs_StockTableQty Set Pcs_StockTableQty.StockQty=Pcs_StockTableQty.StockQty-@StockQty From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo And LotId = @LotId and Stageid=@FinishedStageID and PartId=@PartId and GodId=@GodId and PartyId = 0 and Pcs_StockTableQty.ColId=@Colid and Pcs_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')= 'G' and IsNull(RejectionTypeId,0)=0  And ISNULL(Pcs_StockTable.EmpID,0) = 0

 End  

 End  

 End    

 If (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@StageId)='Piece' or (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@StageId)='Bit'  Or (@Stageid=@SourceStageid)        

 Begin      

 Select @PcsStockId=PcsStockId From Pcs_StockTable where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo And LotID = @LotID and Stageid=@SourceStageId and PartId=@PartId and GodId=@GodId and PartyId=0 And ISNULL(Pcs_StockTable.EmpID,0) = 0   

 if @DelType='Supplier Receipt Rejection'      

 Begin  /*Insert into tmp_trg Values ('START5')*/      

 print 'f'

 Update Pcs_StockTableQty Set Pcs_StockTableQty.StockQty=Pcs_StockTableQty.StockQty-@StockQty From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId = @LotID and Stageid=@SourceStageId and PartId=@PartId and GodId=@GodId and PartyId=0 and Pcs_StockTableQty.ColId=@Colid and Pcs_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')='G' and IsNull(RejectionTypeId,0)=0   And ISNULL(Pcs_StockTable.EmpID,0) = 0 

 End    

 Else     

 Begin  /*Insert into tmp_trg Values ('START6')*/       

 if @GAN_RewrkFlg ='Y' 

 BEGIN

 print 'G11'

 

 if @GAN_RewrkFlg ='Y' 
   Update Pcs_StockTableQty Set Pcs_StockTableQty.RewrkStk=IsNull(Pcs_StockTableQty.RewrkStk,0)-@StockQty From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and
 StyleNo=@StyleNo and LotId = @LotID and Stageid=@SourceStageId and PartId=@PartId and GodId=@GodId and PartyId=0 and Pcs_StockTableQty.ColId=@Colid and Pcs_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')='G' and IsNull(RejectionTypeId,0)=Case When @ProcessType='P' Then 0 Else @RejectionTypeId  End   And ISNULL(Pcs_StockTable.EmpID,0) = 0
ELSE

  Update Pcs_StockTableQty Set Pcs_StockTableQty.RewrkStk=IsNull(Pcs_StockTableQty.RewrkStk,0)-@StockQty From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and
 StyleNo=@StyleNo and LotId = @LotID and Stageid=@SourceStageId and PartId=@PartId and GodId=@GodId and PartyId=0 and Pcs_StockTableQty.ColId=@Colid and Pcs_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')=Case When @ProcessType='P' Then 'G' Else 
'M' End and IsNull(RejectionTypeId,0)=Case When @ProcessType='P' Then 0 Else @RejectionTypeId  End    And ISNULL(Pcs_StockTable.EmpID,0) = 0


 END

 ELSE

 BEGIN

 print 'H'

 Update Pcs_StockTableQty Set Pcs_StockTableQty.StockQty=Pcs_StockTableQty.StockQty-@StockQty From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId = @LotID and Stageid=@SourceStageId and PartId=@PartId and GodId=@GodId and PartyId=0 and Pcs_StockTableQty.ColId=@Colid and Pcs_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')=Case When @ProcessType='P' Then 'G' Else 'M' End and IsNull(RejectionTypeId,0)=Case When @ProcessType='P' Then 0 Else @RejectionTypeId  End  And ISNULL(Pcs_StockTable.EmpID,0) = 0 

 END 

 End  

 End    

 End 