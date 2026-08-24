/*;=============================================   

; Author           :  Global Software's    

; Create date      :  17/08/2022    

; Create By        :  ASLAM  

; Description      :  PANEL_Stock  

; Change Person    :  ASLAM

; Last Change Date :  01/06/2023 10.05 AM 

; =============================================  */  
 

CREATE PROCEDURE PROC_Stock_PanelDelivery_Insert (@Id Int,@Styleno Varchar(20),@PartId int,@ColId Int,@SizeId Int,@SourceStageID Int,@Pcs Int,@LotNo Varchar(15),@compId int) 

AS  DECLARE @Coycode Int,@Partyid Int,@Ordid int,@Stageid int,@GodId int,@SeqNo int,@StockQty int,@PcsStockId int,@ProcessType Char(1),@RejectionTypeId Int ,@DelType Varchar(30) ,@BuyerId Int,@FinishedStageID Int ,@LotId Int ,@Prod_Without_Lot_Despatch_WithLot as char(1), @LotwiseStockReqd   char(1)   

SELECT @Prod_Without_Lot_Despatch_WithLot = isNull(Prod_Without_Lot_Despatch_WithLot,'Y') from Options1    

SELECT @Coycode = Coycode FROM trs_pcs1 where id=@id     

Select @Partyid = IsNull(Party,0) from trs_pcs1 where id=@id     

SELECT @Ordid = OrdJobNo from trs_pcs1 where id=@id      

SELECT @Stageid = TargetStageID from trs_pcs1 where id=@id      

SELECT @GodId = GodId from trs_pcs1 where id=@id      

SELECT @ProcessType = ProcessType from trs_pcs1 where id=@id     

SELECT @RejectionTypeId = RejectionTypeId from trs_pcs1 where id=@id      

Select @SeqNo = SeqNo From Prod_Sequence Where Prod_Sequence.OrdId=@OrdId And Prod_Sequence.StyleNo=@StyleNo And Prod_Sequence.StageId=@Stageid  SELECT @StockQty = @Pcs   

SELECT @LotwiseStockReqd = isNull(LotwiseStock,'Y') from ORDERMAS2 WHERE ORDID=@ORDID  

SELECT @DelType = Deltype from Trs_Pcs1 Where id =@Id   



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

Select  @FinishedStageID = -3  

SELECT @BuyerId = Buyer from Trs_Pcs1 Where id =@Id  	 

end  

if @DelType ='Sales'     

BEGIN	  

SELECT @PartyID = 0   

END /*Select Top 1 @FinishedStageID = StageId  From Panel_StockTable A INNER JOIN Mas_JobWrkComp B ON A.StageId = B.I

D INNER JOIN Mas_Dept C ON B.DeptId = C.DeptID INNER JOIN Trs_Pcs1 D ON A.ORdid = D.Ordjobno Where D.ID = @ID And StyleNo=@StyleNo And  SEMIFINISH='F'   */ 

BEGIN    

If @PartyId>0   

Begin  

If EXISTS (select * from Panel_StockTable where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and Stageid=@Stageid and LotID = @LotId and PartId=@PartId and GodId=@GodId and PartyId=@PartyId)   

BegiN     

Select @PcsStockId=PcsStockId From Panel_StockTable where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo 

and LotID = @LotID and Stageid=@Stageid and PartId=@PartId and GodId=@GodId and PartyId=@PartyId   

 

If EXISTS (select * from Panel_StockTable Inner Join Panel_StockTableQty On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and Stageid=@Stageid and PartId=@PartId and GodId=@GodId and PartyId=@PartyId and Panel_StockTableQty.ColId=@Colid and Panel_StockTableQty.SizeId=@SizeId and Panel_StockTableQty.CompId=@compId and Panel_StockTable.LotID = @LotId and IsNull(GoodPcsFlag,'G')=Case When @ProcessType='P' Then 'G' Else 'M' End  and IsNull(RejectionTypeId,0)=Case When @ProcessType='P' Then 0 Else @RejectionTypeId End)     

Begin     

if @DelType <> 'JobWork Return'    

BEGIN     

Update Panel_StockTableQty Set Panel_StockTableQty.StockQty=Panel_StockTableQty.StockQty+@StockQty From Panel_StockTableQty Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo And LotId= @LotID and Stageid=@Stageid and PartId=@PartId and GodId=@GodId and PartyId=@PartyId and Panel_StockTableQty.ColId=@Colid and Panel_StockTableQty.SizeId=@SizeId and Panel_StockTableQty.CompId=@compId and IsNull(GoodPcsFlag,'G')=Case When @ProcessType='P' Then 'G' Else 'M' End and IsNull(RejectionTypeId,0)=Case When @ProcessType='P' Then 0 Else @RejectionTypeId  

End      

END     

End    

Else      

Begin   /*Insert into tmp_trg Values ('START3')*/   

INSERT INTO Panel_StockTableQty (PcsStockId,colid,Sizeid,StockQty,GoodPcsFlag,RejectionTypeId,compID) VALUES (@PcsStockId,@ColId,@Sizeid,@StockQty,Case When @ProcessType='P' Then 'G' Else 'M' End,Case When @ProcessType='P' Then 0 Else @RejectionTypeId End
,@compId)    

End    

End    

Else     

Begin     

if @DelType <> 'JobWork Return'  	 

begin   

Select @PcsStockId=Max(IsNull(PcsStockId,0))+1 From Panel_StockTable 

 /*Insert into tmp_trg Values ('START4')*/  	  

 print 't1'

INSERT INTO Panel_StockTable (Coycode,Ordid,styleNo,Stageid,PartId,SeqNo,GodId,PcsStockId,PartyId,LotID ) VALUES (@Coycode,@Ordid,@StyleNo,@Stageid,@PartId,@SeqNo,@GodId,@PcsStockId,@PartyId,@LotId)    	  	  

INSERT INTO Panel_StockTableQty (PcsStockId,colid,Sizeid,StockQty,GoodPcsFlag,RejectionTypeId,CompId) VALUES (@PcsStockId,@ColId,@Sizeid,@StockQty,Case When @ProcessType='P' Then 'G' Else 'M' End,Case When @ProcessType='P' Then 0 Else @RejectionTypeId End
,@compId)   

end    

End      

End 

    if @Buyerid >0 and (@DelType='Despatch' OR @DelType ='Sales')    

	Begin     

	if @DelType ='Sales'     

	BEGIN	  

	SELECT @PartyID = 0   

	END  

	

	If EXISTS (select * from Panel_StockTable where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo And LotID = @LotID and Stageid=@FinishedStageID and PartId=@PartId and GodId=@GodId and PartyId=@PartyId)       

	

	begin /*Insert into tmp_trg Values ('Despatch 2 ')*/   

print 't2'	

	If EXISTS (select * from Panel_StockTable Inner Join Panel_StockTableQty On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo And LotId = @LotID and Stageid=@FinishedStageID and PartId
=@PartId and GodId=@GodId and PartyId=0  and Panel_StockTableQty.ColId=@Colid and Panel_StockTableQty.SizeId=@SizeId  and panel_stockTableQty.CompID= @CompID and IsNull(GoodPcsFlag,'G')='G' and IsNull(RejectionTypeId,0)=0 )     



	Begin   /*Insert into tmp_trg Values ('DespSTART2 -' + str(@StockQty))*/    

	print 't3'

	Update Panel_StockTableQty Set Panel_StockTableQty.StockQty=Panel_StockTableQty.StockQty-@StockQty From Panel_StockTableQty Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid 
and StyleNo=@StyleNo And LotId = @LotId and Stageid=@FinishedStageID and PartId=@PartId and GodId=@GodId and PartyId = 0 and Panel_StockTableQty.ColId=@Colid and Panel_StockTableQty.SizeId=@SizeId and Panel_StockTableQty.CompId=@compId and IsNull(GoodPcsFlag,'G')= 'G' and IsNull(RejectionTypeId,0)=0  

	End  

	End  

	End    

	If (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@StageId)='Piece' or (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@StageId)='Bit'  Or (@Stageid=@SourceStageid)  OR (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where 
Id=@StageId)='Panel'       

	Begin    

	print 't4'  

	Select @PcsStockId=PcsStockId From Panel_StockTable where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo And LotID = @LotID and Stageid=@SourceStageId and PartId=@PartId and GodId=@GodId and PartyId=0      

	if @DelType='Supplier Receipt Rejection'      

	Begin  /*Insert into tmp_trg Values ('START5')*/      

	print 't5'

	Update Panel_StockTableQty Set Panel_StockTableQty.StockQty=Panel_StockTableQty.StockQty-@StockQty From Panel_StockTableQty Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid 
and StyleNo=@StyleNo and LotId = @LotID and Stageid=@SourceStageId and PartId=@PartId and GodId=@GodId and PartyId=0 and Panel_StockTableQty.ColId=@Colid and Panel_StockTableQty.SizeId=@SizeId and Panel_StockTableQty.CompId=@compId and IsNull(GoodPcsFlag,
'G')='G' and IsNull(RejectionTypeId,0)=0    

	End    

	Else     

	Begin  /*Insert into tmp_trg Values ('START6')*/       

	print 't6'

	Update Panel_StockTableQty Set Panel_StockTableQty.StockQty=Panel_StockTableQty.StockQty-@StockQty From Panel_StockTableQty Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid 
and StyleNo=@StyleNo and LotId = @LotID and Stageid=@SourceStageId and PartId=@PartId and GodId=@GodId and PartyId=0 and Panel_StockTableQty.ColId=@Colid and Panel_StockTableQty.SizeId=@SizeId and Panel_StockTableQty.CompId=@compId and IsNull(GoodPcsFlag,
'G')=Case When @ProcessType='P' Then 'G' Else 'M' End and IsNull(RejectionTypeId,0)=Case When @ProcessType='P' Then 0 Else @RejectionTypeId  End   

	End  

	End    

	End 